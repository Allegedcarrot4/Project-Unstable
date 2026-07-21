@echo off
start "Vite Dev Server" cmd /c "cd /d C:\Users\arjun\Desktop\Project-Unstable-Node\Unstable-Node-withedits\artifacts\app && npx vite --host"
start "API Server" cmd /c "cd /d C:\Users\arjun\Desktop\Project-Unstable-Node\Unstable-Node-withedits\artifacts\api-server && npm start"
echo Both servers starting...
echo Vite: http://localhost:5173
echo API:  http://localhost:8080
pause
