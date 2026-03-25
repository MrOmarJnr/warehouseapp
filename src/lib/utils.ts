import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined) {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'CREATED': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ASSIGNED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'IN_REPAIR': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'DIAGNOSED': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'REPAIRED': return 'bg-green-100 text-green-800 border-green-200';
    case 'DISPATCHED': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'DELIVERED': return 'bg-teal-100 text-teal-800 border-teal-200';
    case 'ACCEPTED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
    case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'REWORK': return 'bg-rose-100 text-rose-800 border-rose-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export async function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (error) => reject(error);
  });
}
