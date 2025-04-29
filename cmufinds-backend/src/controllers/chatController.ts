import { Request, Response } from "express";
import chatServiceInstance from "../services/chatService";

class ChatController {
  public async thread(req: Request, res: Response) {
    const { postId } = req.body;
    const claimerId = req.user!.userId;
    const thread = await chatServiceInstance.getOrCreateThread(postId, claimerId);
    res.json(thread);
  }

  public async messages(req: Request, res: Response) {
    const { threadId } = req.params;
    const userId = req.user!.userId;
    
    // First verify the user has access to this thread
    const thread = await chatServiceInstance.getThreadById(threadId, userId);
    
    if (thread.status !== 200) {
      res.status(thread.status).json(thread);
      return;
    }
    
    // Then get the messages
    const msgs = await chatServiceInstance.getMessages(threadId);
    
    // Return both thread and messages
    res.status(msgs.status).json({
      ...msgs,
      thread: thread.data
    });
  }

  public async send(req: Request, res: Response) {
    const { threadId } = req.params;
    const senderId = req.user!.userId;
    const { text, imageUrl } = req.body;
    const msg = await chatServiceInstance.sendMessage(threadId, senderId, text, imageUrl);
    res.json(msg);
  }

  public async exportPDF(req: Request, res: Response) {
    const { threadId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    await chatServiceInstance.exportThreadAsPDF(threadId, userId, res);
  }

  public async getThreads(req: Request, res: Response) {
    const userId = req.user!.userId;
    const threads = await chatServiceInstance.getUserThreads(userId);
    res.json(threads);
  }
}

export default new ChatController();
