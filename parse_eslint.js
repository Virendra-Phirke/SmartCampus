const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint.json', 'utf8'));
data.filter(f => f.errorCount > 0).forEach(f => {
  console.log('FILE: ' + f.filePath);
  f.messages.forEach(m => console.log('  Line ' + m.line + ':' + m.column + ' - ' + m.message));
});
