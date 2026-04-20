const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// 1. Configuración del Servidor
const app = express();
app.use(cors()); // Permite conexiones externas
const server = http.createServer(app);

// 2. Inicialización de Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Permite que cualquier cliente se conecte
        methods: ["GET", "POST"]
    }
});

// 3. Memoria del Servidor
const usuariosActivos = {}; // Guarda la relación { uid: socket.id }
const historialGlobal = []; // Guarda los últimos 40 mensajes del chat global

// 4. Lógica de Conexión
io.on('connection', (socket) => {
    console.log('⚡ Un ninja se ha conectado:', socket.id);

    // Registro de usuario al entrar
    socket.on('registrar_usuario', (userData) => {
        usuariosActivos[userData.uid] = socket.id;
        console.log(`✅ Usuario registrado: ${userData.alias} (${userData.uid})`);
        
        // Enviar el historial global al usuario que acaba de entrar
        socket.emit('historial_global', historialGlobal);
    });

    // Manejo de Mensajes Globales
    socket.on('mensaje_global', (data) => {
        data.fecha = new Date().toISOString(); // Añadir marca de tiempo
        
        // Guardar en el historial y limitar a los últimos 40
        historialGlobal.push(data);
        if (historialGlobal.length > 40) {
            historialGlobal.shift();
        }
        
        // Emitir a todos los usuarios conectados
        io.emit('nuevo_mensaje_global', data);
    });

    // Manejo de Mensajes Privados
    socket.on('mensaje_privado', (data) => {
        const socketDestino = usuariosActivos[data.targetUid];
        
        if (socketDestino) {
            // Enviar mensaje al destinatario
            io.to(socketDestino).emit('nuevo_mensaje_privado', data);
            
            // Enviar notificación de alerta al destinatario
            io.to(socketDestino).emit('alerta_privada', {
                deUid: data.uid,
                deNombre: data.autorNombre,
                deFoto: data.autorFoto
            });
        }
        
        // Enviar el mensaje de vuelta al remitente para que aparezca en su pantalla
        socket.emit('nuevo_mensaje_privado', data);
    });

    // Desconexión
    socket.on('disconnect', () => {
        // Limpiar el registro de usuarios activos
        for (let uid in usuariosActivos) {
            if (usuariosActivos[uid] === socket.id) {
                console.log(`❌ Usuario desconectado: ${uid}`);
                delete usuariosActivos[uid];
                break;
            }
        }
    });
});

// 5. Encendido del Servidor
// Usamos process.env.PORT para que funcione en Render y localmente en el puerto 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor Chap Otaku corriendo en el puerto ${PORT}`);
});