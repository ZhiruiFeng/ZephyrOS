#!/usr/bin/env node

/**
 * Setup script for ZMemory MCP with API key authentication
 * This replaces the OAuth flow with simple API key authentication
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Claude Desktop config paths by platform
const getClaudeConfigPath = () => {
  const platform = os.platform();
  const homeDir = os.homedir();

  switch (platform) {
    case 'darwin': // macOS
      return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32': // Windows
      return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
    case 'linux': // Linux
      return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

const setupApiKeyAuth = async () => {
  console.log('🔑 ZMemory MCP API Key Authentication Setup');
  console.log('==========================================\n');

  // Get API key from user
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = (question) => {
    return new Promise((resolve) => {
      readline.question(question, resolve);
    });
  };

  try {
    console.log('First, generate an API key:');
    console.log('1. Open ZFlow: http://localhost:3000');
    console.log('2. Go to Profile > API Keys');
    console.log('3. Add new key for "ZMemory" vendor');
    console.log('4. Copy the generated API key\n');

    const apiKey = await askQuestion('Enter your ZMemory API key (starts with zm_): ');

    if (!apiKey || !apiKey.startsWith('zm_')) {
      console.error('❌ Invalid API key format. Must start with "zm_"');
      process.exit(1);
    }

    const apiUrl = await askQuestion('ZMemory API URL (default: http://localhost:3001): ') || 'http://localhost:3001';

    // Get current working directory for the MCP server path
    const mcpServerPath = path.join(__dirname, '..', 'src', 'index.js');

    // Create Claude Desktop configuration
    const config = {
      mcpServers: {
        'zmemory-mcp': {
          command: 'node',
          args: [mcpServerPath],
          env: {
            ZMEMORY_API_URL: apiUrl,
            ZMEMORY_API_KEY: apiKey
          }
        }
      }
    };

    // Get Claude Desktop config path
    const claudeConfigPath = getClaudeConfigPath();
    const claudeConfigDir = path.dirname(claudeConfigPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(claudeConfigDir)) {
      fs.mkdirSync(claudeConfigDir, { recursive: true });
      console.log(`📁 Created directory: ${claudeConfigDir}`);
    }

    // Read existing config if it exists
    let existingConfig = {};
    if (fs.existsSync(claudeConfigPath)) {
      try {
        const existingContent = fs.readFileSync(claudeConfigPath, 'utf8');
        existingConfig = JSON.parse(existingContent);
        console.log('📖 Found existing Claude Desktop configuration');
      } catch (error) {
        console.log('⚠️  Existing config file is invalid JSON, creating new one');
      }
    }

    // Merge configurations
    const finalConfig = {
      ...existingConfig,
      mcpServers: {
        ...existingConfig.mcpServers,
        ...config.mcpServers
      }
    };

    // Write configuration
    fs.writeFileSync(claudeConfigPath, JSON.stringify(finalConfig, null, 2));
    console.log(`✅ Configuration written to: ${claudeConfigPath}`);

    // Create backup config file
    const backupPath = path.join(__dirname, '..', 'configs', 'claude-desktop-config-backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(finalConfig, null, 2));
    console.log(`💾 Backup saved to: ${backupPath}`);

    console.log('\n🎉 Setup Complete!');
    console.log('\nNext steps:');
    console.log('1. Restart Claude Desktop');
    console.log('2. Open Claude Code');
    console.log('3. Test with: "Show me my current tasks"');
    console.log('\nIf you need to update your API key, run this script again.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    readline.close();
  }
};

// Run setup if called directly
if (require.main === module) {
  setupApiKeyAuth().catch(console.error);
}

module.exports = { setupApiKeyAuth };