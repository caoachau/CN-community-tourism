import { AppError } from '../shared/errors.js';
import { ownershipRule } from './ownership.js';

const fields = 'id, email, phone, display_name, password_hash, role, status, disabled_at';
const execute = (connection, sql, values = []) => connection.execute({ sql, timeout: 5000 }, values);
const first = async (connection, sql, values) => (await execute(connection, sql, values))[0][0] ?? null;

export function createAuthQueries(connection) {
  return {
    findUserByEmail: (email) => first(connection, `SELECT ${fields} FROM users WHERE email = ?`, [email]),
    findUserById: (id, lock = false) => first(connection, `SELECT ${fields} FROM users WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]),
    async createUser(input) {
      try {
        await execute(connection,
          'INSERT INTO users (email, phone, display_name, password_hash, role, updated_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(6))',
          [input.email, input.phone ?? null, input.displayName, input.passwordHash, input.role]);
      } catch (error) {
        // This INSERT has one user-supplied unique key: users.email.
        if (error.code === 'ER_DUP_ENTRY') throw new AppError('EMAIL_ALREADY_EXISTS');
        throw error;
      }
      // LAST_INSERT_ID is selected as CHAR to preserve IDs above JS safe integers.
      const row = await first(connection, 'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id');
      return this.findUserById(row.id);
    },
    async createSession(userId, tokenHash, expiresAt) {
      await execute(connection, 'INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt]);
      const row = await first(connection, 'SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id');
      return this.findSession(row.id, userId);
    },
    findSessionByHash: (hash) => first(connection,
      'SELECT id, user_id FROM auth_sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6)', [hash]),
    findSession: (id, userId, lock = false) => first(connection,
      `SELECT *, (revoked_at IS NULL AND expires_at > UTC_TIMESTAMP(6)) AS is_live FROM auth_sessions WHERE id = ? AND user_id = ?${lock ? ' FOR UPDATE' : ''}`, [id, userId]),
    async rotateSession(id, tokenHash) {
      await execute(connection, 'UPDATE auth_sessions SET token_hash = ? WHERE id = ?', [tokenHash, id]);
    },
    async revokeSession(id, userId) {
      await execute(connection, 'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, UTC_TIMESTAMP(6)) WHERE id = ? AND user_id = ?', [id, userId]);
    },
    async revokeUserSessions(userId) {
      const [result] = await execute(connection, 'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [userId]);
      return result.affectedRows;
    },
    async setUserStatus(userId, status) {
      await execute(connection, `UPDATE users SET status = ?, disabled_at = ${status === 'BLOCKED' ? 'COALESCE(disabled_at, UTC_TIMESTAMP(6))' : 'NULL'}, updated_at = UTC_TIMESTAMP(6) WHERE id = ?`, [status, userId]);
    },
    async recordAccountStatus(actorId, before, after, reason, correlationId, revokedSessionCount) {
      await execute(connection, `INSERT INTO activity_events
        (actor_user_id, actor_type, event_type, entity_type, entity_id, from_status, to_status, before_data, after_data, reason, correlation_id)
        VALUES (?, 'ADMIN', 'OTHER', 'USER', ?, ?, ?, ?, ?, ?, ?)`, [
        actorId, after.id, before.status, after.status,
        JSON.stringify({ status: before.status, disabledAt: before.disabled_at }),
        JSON.stringify({ status: after.status, disabledAt: after.disabled_at, action: 'ACCOUNT_STATUS_CHANGED', revokedSessionCount }),
        reason, correlationId,
      ]);
    },
    findAuthentication: (id, userId) => first(connection,
      `SELECT ${fields.split(', ').map((name) => `u.${name}`).join(', ')},
       (s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(6)) AS session_live
       FROM users u JOIN auth_sessions s ON s.user_id = u.id WHERE s.id = ? AND u.id = ?`, [id, userId]),
    findHousehold: (id, lock = false) => first(connection,
      `SELECT id, owner_user_id, approval_status, archived_at FROM households WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [id]),
    findOwnership: (type, id) => first(connection, ownershipRule(type).sql, [id]),
  };
}

export function createAuthRepository(database) {
  return {
    read: (work) => database.withConnection((connection) => work(createAuthQueries(connection))),
    transaction: (work) => database.transaction((connection) => work(createAuthQueries(connection))),
  };
}
