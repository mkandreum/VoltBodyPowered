import { useState } from 'react';
import type { SyntheticEvent, HTMLAttributeReferrerPolicy } from 'react';

type LazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  onError?: (e: SyntheticEvent<HTMLImageElement, Event>) => void;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  loading?: 'lazy' | 'eager';
};

/**
 * Image with a shimmer skeleton placeholder shown while loading.
 * Fades in the image once loaded for a polished 60fps transition.
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  skeletonClassName = '',
  onError,
  referrerPolicy,
  loading = 'lazy',
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const handleLoad = () => setLoaded(true);
  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setLoaded(true);
    setErrored(true);
    onError?.(e);
  };

  return (
    <>
      {!loaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 anim-shimmer ${skeletonClassName}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy={referrerPolicy}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} transition-opacity duration-300 ease-out ${loaded ? 'opacity-100' : errored ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}
