const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const extract = require('extract-zip');
const tar = require('tar');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

// Create multer instance without storage configuration
const upload = multer({ storage: multer.memoryStorage() });

// Handle template upload
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      console.log('Request body:', req.body);
      console.log('File:', req.file);

      const deploymentName = req.body.deploymentName;
      if (!deploymentName) {
        throw new Error('Deployment name is required');
      }

      if (!req.file) {
        throw new Error('No file uploaded');
      }

      // Create directory for deployment
      const deploymentDir = path.join(__dirname, '..', 'deploymentTemplate', deploymentName);
      
      // Check if directory already exists
      try {
        const exists = await fs.access(deploymentDir).then(() => true).catch(() => false);
        if (exists) {
          throw new Error('Deployment name already exists');
        }
      } catch (error) {
        if (error.message !== 'Deployment name already exists') {
          throw error;
        } else {
          return res.status(400).json({ error: error.message });
        }
      }

      // Create directory
      await fs.mkdir(deploymentDir, { recursive: true });
      console.log('Created directory:', deploymentDir);

      // Create temporary file for extraction
      const tempFile = path.join(deploymentDir, req.file.originalname);
      await fs.writeFile(tempFile, req.file.buffer);

      // Extract based on file type
      if (req.file.originalname.endsWith('.zip')) {
        await extract(tempFile, { 
          dir: deploymentDir,
          onEntry: (entry) => {
            // Keep subfolder structure but remove the root folder if it exists
            const pathParts = entry.fileName.split('/');
            if (pathParts[0] === deploymentName) {
              // If first folder matches deployment name, remove it
              pathParts.shift();
              entry.fileName = pathParts.join('/');
            }
          }
        });
      } else if (req.file.originalname.endsWith('.tar') || req.file.originalname.endsWith('.tar.gz')) {
        await tar.x({
          file: tempFile,
          cwd: deploymentDir,
          filter: (path) => {
            // Keep subfolder structure but remove the root folder if it exists
            const pathParts = path.split('/');
            if (pathParts[0] === deploymentName) {
              // If first folder matches deployment name, remove it
              return pathParts.slice(1).join('/');
            }
            return path;
          }
        });
      }

      // Remove temporary file
      await fs.unlink(tempFile);

      // Look for template file recursively
      const findTemplateFile = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = await findTemplateFile(fullPath);
            if (found) return found;
          } else if (/-template\.(yaml|yml)$/.test(entry.name)) {
            return path.relative(deploymentDir, fullPath);
          }
        }
        return null;
      };

      const templateFile = await findTemplateFile(deploymentDir);
      console.log('Found template files:', {
        deploymentDir,
        templateFile
      });
      
      if (!templateFile) {
        // Clean up if no template file found
        await fs.rm(deploymentDir, { recursive: true, force: true });
        throw new Error('No template file found in the uploaded archive');
      }

      // Return success response
      res.json({
        message: 'Template uploaded and extracted successfully',
        deploymentName: deploymentName,
        templatePath: path.join(deploymentDir, templateFile)
      });

    } catch (error) {
      console.error('Upload error:', error);
      // Clean up on error
      if (deploymentName) {
        const dir = path.join(__dirname, '..', 'deploymentTemplate', deploymentName);
        await fs.rm(dir, { recursive: true, force: true }).catch(console.error);
      }
      res.status(400).json({ error: error.message });
    }
  });
});

// Add endpoint to check if deployment name exists
router.get('/check-name/:name', async (req, res) => {
  try {
    const deploymentDir = path.join(__dirname, '..', 'deploymentTemplate', req.params.name);
    const exists = await fs.access(deploymentDir).then(() => true).catch(() => false);
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to delete deployment directory
router.delete('/:name', async (req, res) => {
  try {
    const deploymentDir = path.join(__dirname, '..', 'deploymentTemplate', req.params.name);
    await fs.rm(deploymentDir, { recursive: true, force: true });
    res.json({ message: 'Deployment directory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to list files in deployment directory
router.get('/:name/files', async (req, res) => {
  try {
    const deploymentName = req.params.name;
    const dir = path.join(__dirname, '..', 'deploymentTemplate', deploymentName);
    
    // Get all files recursively
    const getFiles = async (dir) => {
      const dirents = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(dirents.map(async (dirent) => {
        const res = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          return getFiles(res);
        } else {
          // Return just the file name without the deployment name prefix
          return dirent.name;
        }
      }));
      return files.flat();
    };

    const files = await getFiles(dir);
    
    // Find template file with pattern [abc]-template.yaml or [abc]-[def]-template.yaml
    const templateFile = files.find(file => {
      return /-template\.(yaml|yml)$/.test(file);
    });

    if (!templateFile) {
      return res.status(404).json({ error: 'No template file found' });
    }

    res.json([templateFile]); // Return array with single template file
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to get specific file content
router.get('/:name/file/:file(*)', async (req, res) => {
  try {
    const deploymentName = req.params.name;
    const fileName = req.params.file;
    // Remove any deployment name prefix from the file path
    const filePath = path.join(__dirname, '..', 'deploymentTemplate', deploymentName, fileName);

    console.log('Reading template file:', {
      deploymentName,
      fileName,
      filePath
    });

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    console.log('Template file content length:', content.length);
    res.send(content);
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to save template content
router.put('/:name/template', express.text(), async (req, res) => {
  try {
    const deploymentName = req.params.name;
    const content = req.body;

    if (!content) {
      throw new Error('No content provided');
    }

    // Find the template file
    const dir = path.join(__dirname, '..', 'deploymentTemplate', deploymentName);
    const files = await fs.readdir(dir, { recursive: true });
    
    // Find template file and normalize path
    const templateFile = files.find(file => {
      const fileName = path.basename(file);
      return /-template\.(yaml|yml)$/.test(fileName);
    });
    
    if (!templateFile) {
      return res.status(404).json({ error: 'Template file not found' });
    }

    // Normalize the template file path
    const normalizedTemplatePath = templateFile.replace(new RegExp(`^${deploymentName}/`), '');
    const filePath = path.join(dir, normalizedTemplatePath);

    console.log('Template file paths:', {
      dir,
      templateFile,
      normalizedTemplatePath,
      filePath
    });

    // Save the new content
    await fs.writeFile(filePath, content, 'utf8');

    console.log('Template file updated:', {
      deploymentName,
      filePath,
      contentLength: content.length,
      contentPreview: content.substring(0, 100)
    });

    res.json({
      message: 'Template updated successfully',
      path: filePath
    });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add endpoint to save final configuration
router.post('/:name/save-final', express.json(), async (req, res) => {
  try {
    const deploymentName = req.params.name;
    const { content, fileName } = req.body;

    if (!content || !fileName) {
      throw new Error('Content and fileName are required');
    }

    // Save to deployment directory
    const deploymentDir = path.join(__dirname, '..', 'deploymentTemplate', deploymentName);
    const filePath = path.join(deploymentDir, fileName);

    // Save the content
    await fs.writeFile(filePath, content, 'utf8');

    console.log('Final configuration saved:', {
      deploymentName,
      fileName,
      filePath,
      contentLength: content.length
    });

    res.json({
      message: 'Final configuration saved successfully',
      path: filePath
    });
  } catch (error) {
    console.error('Error saving final configuration:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;