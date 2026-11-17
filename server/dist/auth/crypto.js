import crypto from 'node:crypto';
export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
export function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}
export function generateAdminPassword() {
    return crypto.randomBytes(18).toString('base64url');
}
export function getUserDocId(email) {
    return `user:${normalizeEmail(email)}`;
}
export function getSessionDocId(token) {
    return `session:${hashToken(token)}`;
}
export function getTokenDocId(token) {
    return `token:${hashToken(token)}`;
}
//# sourceMappingURL=crypto.js.map