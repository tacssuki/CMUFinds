import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

class UploadService {
  public static readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  public static readonly maxSize = 25 * 1024 * 1024;
  public static readonly basePaths = {
    posts: path.resolve(__dirname, '../../uploads/posts/'),
    profiles: path.resolve(__dirname, '../../uploads/profiles/')
  };

  public static ensureDirs() {
    Object.entries(this.basePaths).forEach(([context, dir]) => {
      try {
        if (!fs.existsSync(dir)) {
          console.log(`Creating upload directory: ${dir}`);
          fs.mkdirSync(dir, { recursive: true });
          
          // Verify directory was created
          if (fs.existsSync(dir)) {
            console.log(`✅ Successfully created ${context} upload directory at: ${dir}`);
            
            // Make sure directory has write permissions
            try {
              // Create a test file to check write permissions
              const testFile = path.join(dir, '.test');
              fs.writeFileSync(testFile, 'test');
              fs.unlinkSync(testFile);
              console.log(`✅ Write permissions verified for ${dir}`);
            } catch (writeError) {
              console.error(`❌ Directory created but lacks write permissions: ${dir}`, writeError);
            }
          } else {
            console.error(`❌ Failed to create ${context} upload directory: ${dir}`);
          }
        } else {
          console.log(`✅ ${context} upload directory already exists at: ${dir}`);
          
          // Verify permissions
          try {
            const stats = fs.statSync(dir);
            const isDir = stats.isDirectory();
            if (!isDir) {
              console.error(`❌ Path exists but is not a directory: ${dir}`);
            }
          } catch (statError) {
            console.error(`❌ Error checking ${context} directory status:`, statError);
          }
        }
      } catch (error) {
        console.error(`❌ Error ensuring ${context} directory:`, error);
      }
    });
  }

  public static async processImages(
    files: Express.Multer.File[],
    context: keyof typeof UploadService.basePaths
  ): Promise<string[]> {


    const folder = this.basePaths[context];
    const processed: string[] = [];

    this.ensureDirs();

    for (const file of files) {
        // Generate a more unique filename (e.g., using UUID)
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${uniqueSuffix}.webp`;
        const outputPath = path.join(folder, filename);

        try {
            await sharp(file.buffer)
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true }) // prevent enlarging small images
                .webp({ quality: 80 })
                .toFile(outputPath);
            // Return the filename part only, assuming a static serving path later
            processed.push(filename);
        } catch (error) {
            console.error(`Error processing image ${file.originalname}:`, error);
            throw new Error(`Server setup error: Could not create upload directory`);
        }
    }

    return processed;
  }
}

export default UploadService;