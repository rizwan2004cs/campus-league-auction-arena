import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const resolvePlayerImage = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return supabase.storage.from('player-images').getPublicUrl(imageUrl).data.publicUrl || null;
};

interface PlayerPhotoProps {
  src?: string | null;
  name: string;
  /** cover: fills the box (grids). stage: whole photo, any aspect, on a field of its own colour. */
  fit?: 'cover' | 'stage';
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}

const PlayerPhoto = ({ src, name, fit = 'cover', priority = false, className, imgClassName }: PlayerPhotoProps) => {
  const url = resolvePlayerImage(src);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(url ? 'loading' : 'error');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStatus(url ? 'loading' : 'error');
    // A cached image can finish before React attaches onLoad.
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setStatus('loaded');
  }, [url]);

  return (
    <div className={cn('relative overflow-hidden bg-raised', className)}>
      {status === 'loading' && <div className="absolute inset-0 skeleton" aria-hidden />}

      {/* Broadcast framing: the same photo, enlarged and blurred, fills the space the whole photo leaves. */}
      {fit === 'stage' && url && status === 'loaded' && (
        <img
          src={url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl saturate-150"
        />
      )}

      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-raised" aria-label={name} role="img">
          <span className="figure text-soft" style={{ fontSize: 'clamp(2rem, 30%, 6rem)' }}>
            {name.trim().charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <img
          ref={imgRef}
          key={url}
          src={url!}
          alt={name}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          // @ts-expect-error fetchpriority is valid HTML, React 18 types lag behind
          fetchpriority={priority ? 'high' : 'auto'}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={cn(
            'absolute inset-0 h-full w-full transition-opacity duration-300 ease-out motion-reduce:transition-none',
            fit === 'stage' ? 'object-contain' : 'object-cover object-[center_30%]',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  );
};

export default PlayerPhoto;
