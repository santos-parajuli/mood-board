
'use client';

import Image from 'next/image';

export default function Pillow({ pillow }) {
  return (
    <div className="group relative">
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200 xl:aspect-h-8 xl:aspect-w-7">
        <Image
          src={pillow['First Pic URL']}
          alt={pillow.Name}
          width={200}
          height={200}
          className="h-full w-full object-cover object-center group-hover:opacity-75"
        />
      </div>
      <h3 className="mt-4 text-sm text-gray-700">{pillow.Name}</h3>
    </div>
  );
}
