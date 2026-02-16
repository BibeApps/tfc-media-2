-- Add bio column to team_members table
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment
COMMENT ON COLUMN team_members.bio IS 'Biography or description of the team member';
