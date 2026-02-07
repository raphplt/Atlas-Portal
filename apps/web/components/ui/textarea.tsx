import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return <textarea ref={ref} className={cn('input-base min-h-28', className)} {...props} />;
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
