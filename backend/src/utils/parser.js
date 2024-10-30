export const parseImageInfo = (image) => {
  return {
    id: image.ID,
    name: image.Repository,
    tag: image.Tag,
    created: new Date(image.CreatedAt),
    size: parseInt(image.Size),
    digest: image.Digest
  };
}; 