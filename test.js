import http from 'http';

http.get('http://localhost:3000', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('Data length:', chunk.length);
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
