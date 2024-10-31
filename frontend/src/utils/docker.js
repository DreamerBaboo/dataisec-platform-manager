export const parseImageName = (fullName) => {
  const [name, tag = 'latest'] = fullName.split(':');
  return { name, tag };
};

export const buildImageName = (name, tag) => {
  return `${name}:${tag}`;
};

export const validateImageName = (name) => {
  const pattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
  return pattern.test(name);
};

export const validateTag = (tag) => {
  const pattern = /^[a-zA-Z0-9_.-]+$/;
  return pattern.test(tag);
}; 