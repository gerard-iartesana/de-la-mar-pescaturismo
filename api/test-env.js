module.exports = async function handler(req, res) {
  res.status(200).json({
    env_keys: Object.keys(process.env).filter(k => k.includes('REDSYS') || k.includes('SUPABASE')),
    REDSYS_ENV: process.env.REDSYS_ENV,
    REDSYS_MERCHANT_CODE_len: process.env.REDSYS_MERCHANT_CODE ? process.env.REDSYS_MERCHANT_CODE.length : 0,
    REDSYS_TERMINAL_len: process.env.REDSYS_TERMINAL ? process.env.REDSYS_TERMINAL.length : 0,
    REDSYS_SECRET_KEY_len: process.env.REDSYS_SECRET_KEY ? process.env.REDSYS_SECRET_KEY.length : 0,
    REDSYS_MERCHANT_CODE_val: process.env.REDSYS_MERCHANT_CODE || 'not set'
  });
};
