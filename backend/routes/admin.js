import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Verifies the request is from a logged-in user with role admin or hr.
// Stashes the caller's role on req so the handler can apply extra restrictions.
async function requireAdminOrHR(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !['admin', 'hr'].includes(profile?.role)) {
    return res.status(403).json({ error: 'Admin or HR access required' });
  }

  req.callerRole = profile.role;
  next();
}

// POST /api/admin/create-user
router.post('/create-user', requireAdminOrHR, async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password, and full_name are required' });
    }

    const validRoles = ['employee', 'manager', 'finance', 'admin', 'hr'];
    let assignedRole = validRoles.includes(role) ? role : 'employee';

    // HR can only ever create employee accounts, enforced server side
    // regardless of what the request claims, since this is a security
    // boundary, not just a UI convenience.
    if (req.callerRole === 'hr') {
      assignedRole = 'employee';
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({ id: created.user.id, full_name, role: assignedRole })
      .select()
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    res.json({ user: profile });
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

export default router;