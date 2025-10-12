let ioInstance = null;


export const initSocket = (io) => {
    ioInstance = io;
};


export const getIO = () => {
if (!ioInstance) throw new Error("Socket.io not initialized. Call initSocket(io) from server startup.");
return ioInstance;
};