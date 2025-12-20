import { supabase } from './supabase';

// ============================================================================
// WORKSPACE MANAGEMENT
// ============================================================================

/**
 * Get all workspaces the current user is a member of
 */
export async function getMyWorkspaces(userId) {
    const { data, error } = await supabase
        .from('workspace_members')
        .select(`
            workspace_id,
            role,
            workspace:workspace_id (
                id,
                name,
                owner_id,
                created_at
            )
        `)
        .eq('user_id', userId);

    if (error) throw error;
    return data.map(m => ({ ...m.workspace, role: m.role }));
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspace(workspaceId) {
    const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get all members of a workspace with their user info
 */
export async function getWorkspaceMembers(workspaceId) {
    const { data, error } = await supabase
        .from('workspace_members')
        .select(`
            id,
            user_id,
            role,
            joined_at
        `)
        .eq('workspace_id', workspaceId);

    if (error) throw error;

    // Fetch user metadata for each member
    const membersWithProfiles = await Promise.all(
        data.map(async (member) => {
            // Get user from auth.users via admin or use cached profile
            // For now, we'll try to get from Supabase auth
            const { data: userData } = await supabase.auth.admin?.getUserById(member.user_id) || {};
            return {
                ...member,
                email: userData?.user?.email || 'Unknown',
                avatar_url: userData?.user?.user_metadata?.avatar_url || null
            };
        })
    );

    return membersWithProfiles;
}

/**
 * Get workspace members with basic info (client-safe)
 */
export async function getWorkspaceMembersBasic(workspaceId) {
    const { data, error } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, joined_at')
        .eq('workspace_id', workspaceId);

    if (error) throw error;
    return data;
}

/**
 * Create a new workspace
 */
export async function createWorkspace(name, ownerId) {
    const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({ name, owner_id: ownerId })
        .select()
        .single();

    if (workspaceError) throw workspaceError;

    // Add owner as member
    const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
            workspace_id: workspace.id,
            user_id: ownerId,
            role: 'owner'
        });

    if (memberError) throw memberError;

    return workspace;
}

/**
 * Update workspace name
 */
export async function updateWorkspace(workspaceId, updates) {
    const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================================================
// INVITATION MANAGEMENT
// ============================================================================

/**
 * Send an invitation to join a workspace
 */
export async function inviteToWorkspace(workspaceId, email, invitedBy) {
    // Check if already a member
    const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', (
            await supabase.from('auth.users').select('id').eq('email', email).single()
        )?.data?.id)
        .maybeSingle();

    if (existingMember) {
        throw new Error('Deze gebruiker is al lid van de workspace');
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
        .from('workspace_invitations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', email)
        .eq('accepted', false)
        .maybeSingle();

    if (existingInvite) {
        throw new Error('Er is al een uitnodiging verstuurd naar dit e-mailadres');
    }

    // Create invitation
    const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
            workspace_id: workspaceId,
            email: email.toLowerCase(),
            invited_by: invitedBy
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Get pending invitations for a workspace
 */
export async function getWorkspaceInvitations(workspaceId) {
    const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data;
}

/**
 * Get invitations sent to a specific email
 */
export async function getMyInvitations(email) {
    const { data, error } = await supabase
        .from('workspace_invitations')
        .select(`
            *,
            workspace:workspace_id (id, name)
        `)
        .eq('email', email.toLowerCase())
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data;
}

/**
 * Accept an invitation using the token
 */
export async function acceptInvitation(token) {
    const { data, error } = await supabase
        .rpc('accept_workspace_invitation', { p_token: token });

    if (error) throw error;
    return data;
}

/**
 * Cancel/delete an invitation
 */
export async function cancelInvitation(invitationId) {
    const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

    if (error) throw error;
}

// ============================================================================
// MEMBER MANAGEMENT
// ============================================================================

/**
 * Remove a member from a workspace
 */
export async function removeMember(workspaceId, userId) {
    const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

    if (error) throw error;
}

/**
 * Update a member's role
 */
export async function updateMemberRole(workspaceId, userId, newRole) {
    const { data, error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Leave a workspace (for non-owners)
 */
export async function leaveWorkspace(workspaceId, userId) {
    // Check if user is owner
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    if (workspace?.owner_id === userId) {
        throw new Error('De eigenaar kan de workspace niet verlaten. Draag eerst het eigendom over of verwijder de workspace.');
    }

    await removeMember(workspaceId, userId);
}
