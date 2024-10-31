export const IMAGE_PERMISSIONS = {
  VIEW: 'image:view',
  PULL: 'image:pull', 
  PUSH: 'image:push',
  DELETE: 'image:delete',
  TAG: 'image:tag',
  MANAGE: 'image:manage'
};

export const USER_ROLES = {
  admin: {
    ...existingAdminPermissions,
    permissions: [
      ...existingAdminPermissions.permissions,
      ...Object.values(IMAGE_PERMISSIONS)
    ]
  },
  testuser: {
    ...existingUserPermissions,
    permissions: [
      ...existingUserPermissions.permissions,
      IMAGE_PERMISSIONS.VIEW,
      IMAGE_PERMISSIONS.PULL
    ]
  }
}; 