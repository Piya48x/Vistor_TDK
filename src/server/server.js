// server.js
import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("newVisitor", (visitor) => {
    console.log("New visitor:", visitor);
    // ส่งสัญญาณไป client ทุกคน (Report page)
    io.emit("newVisitor", visitor);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

httpServer.listen(3001, () => {
  console.log("Socket.IO server running on port 3001");
});


// // server.js
// import { createServer } from "http";
// import express from "express";
// import { Server } from "socket.io";
// import cors from "cors";

// const app = express();
// app.use(cors());
// app.use(express.json()); // รองรับ JSON body

// const httpServer = createServer(app);

// const io = new Server(httpServer, {
//   cors: { origin: "*" }
// });

// // Socket.IO connection
// io.on("connection", (socket) => {
//   console.log("Client connected:", socket.id);

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });

// // API สำหรับบันทึก visitor ใหม่ และ emit event ไป client
// app.post("/add-visitor", (req, res) => {
//   const visitor = req.body; // รับข้อมูล visitor จาก client
//   if (!visitor || !visitor.id) {
//     return res.status(400).json({ error: "Invalid visitor data" });
//   }

//   // ส่งสัญญาณไป client ทุกคน
//   io.emit("newVisitor", visitor);

//   console.log("New visitor emitted:", visitor);
//   res.json({ success: true });
// });

// httpServer.listen(3001, () => {
//   console.log("Socket.IO server running on port 3001");
// });
