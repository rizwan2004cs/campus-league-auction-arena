export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  try {
    console.log(`[${new Date().toISOString()}] Keep-alive ping executed`);
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Campus League Auction Arena is awake!',
    });
  } catch (error) {
    console.error('Keep-alive ping failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute keep-alive ping',
    });
  }
}
