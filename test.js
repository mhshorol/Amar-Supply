const fetch = require('node-fetch');
fetch('http://localhost:3000/api/users/foo', {method: 'DELETE'}).then(res => res.json()).then(console.log);
