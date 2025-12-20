import { supabase } from '../lib/supabase';
import fs from 'fs';
import path from 'path';

export const uploadArtifact = async (filePath: string, bucket: string = 'artifacts'): Promise<string | null> => {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`[Storage] File not found for upload: ${filePath}`);
            return null;
        }

        const fileName = `${Date.now()}-${path.basename(filePath)}`;
        const fileBuffer = fs.readFileSync(filePath);

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, fileBuffer, {
                contentType: filePath.endsWith('.webm') ? 'video/webm' : 'image/png',
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('[Storage] Error uploading to Supabase:', error);
            // Bucket might not exist, notify user if it's likely the case
            if (error.message.includes('bucket not found')) {
                console.error('[Storage] Please create the "artifacts" bucket in Supabase Storage and make it PUBLIC.');
            }
            return null;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        console.log(`[Storage] ✓ Uploaded ${filePath} to ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error('[Storage] Unexpected error uploading artifact:', error);
        return null;
    }
};
