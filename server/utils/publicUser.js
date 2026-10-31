// Explicit public identity fields also exclude unknown legacy fields such as
// old embedded card numbers. Database documents are never API response shapes.
const FIELDS=['id','name','email','role','avatar','phone','address','isEmailVerified','twoFactorEnabled','active','createdAt','updatedAt'];
export const publicUser=user=>Object.fromEntries(FIELDS.filter(field=>user[field]!==undefined).map(field=>[field,user[field]]));
