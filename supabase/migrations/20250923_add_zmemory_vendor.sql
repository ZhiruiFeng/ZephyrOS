-- Add ZMemory as a vendor for API key management
-- This enables users to generate long-lived API keys for MCP access

INSERT INTO vendors (id, name, description, auth_type, base_url, is_active) VALUES
('zmemory', 'ZMemory', 'Personal AI memory and task management system', 'api_key', 'http://localhost:3001', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  base_url = EXCLUDED.base_url,
  is_active = EXCLUDED.is_active;

-- Add ZMemory services
INSERT INTO vendor_services (id, vendor_id, service_name, display_name, description, is_active) VALUES
('zmemory_api', 'zmemory', 'zmemory_api', 'ZMemory API', 'Full access to ZMemory API including tasks, memories, and AI agents', true),
('zmemory_mcp', 'zmemory', 'zmemory_mcp', 'ZMemory MCP', 'Model Context Protocol access for Claude Code integration', true)
ON CONFLICT (id) DO UPDATE SET
  vendor_id = EXCLUDED.vendor_id,
  service_name = EXCLUDED.service_name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;