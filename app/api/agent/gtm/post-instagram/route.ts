import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  let tempFilePath = '';
  let tempConfigPath = '';
  try {
    const { image, caption, sessionId } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Decode base64 image
    let base64Data = image;
    if (image.includes(',')) {
      base64Data = image.split(',')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');

    // Save to temp file
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    tempFilePath = path.join(tempDir, `insta_upload_${timestamp}.jpg`);
    fs.writeFileSync(tempFilePath, buffer);

    // Save config payload to a temp json file to prevent command line argument parsing errors (like quotes/newlines)
    tempConfigPath = path.join(tempDir, `insta_config_${timestamp}.json`);
    const configData = {
      image_path: tempFilePath,
      caption: caption,
      session_id: sessionId
    };
    fs.writeFileSync(tempConfigPath, JSON.stringify(configData, null, 2), 'utf-8');

    console.log('[instagram-post] Temp config saved to:', tempConfigPath);

    // Call python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'post_instagram.py');
    const command = `python "${scriptPath}" "${tempConfigPath}"`;
    
    console.log('[instagram-post] Running command:', command);
    
    const { stdout } = await execAsync(command);
    
    console.log('[instagram-post] Python output:', stdout);

    let result;
    try {
      result = JSON.parse(stdout.trim());
    } catch (e) {
      throw new Error(`Failed to parse python output: ${stdout}`);
    }

    if (!result.success) {
      throw new Error(result.error || 'Unknown error occurred during posting');
    }

    return NextResponse.json({ success: true, mediaId: result.media_id });
  } catch (err: any) {
    console.error('[instagram-post] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    // Cleanup temp files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      try { fs.unlinkSync(tempConfigPath); } catch (e) {}
    }
  }
}
