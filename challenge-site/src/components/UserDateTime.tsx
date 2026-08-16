'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatUserDate,
  formatUserDateShort,
  formatUserDateTime,
  formatUserDateTimeShort,
  parseUserDate,
  type UserDateFormatMode,
} from '@/lib/format-user-datetime';

type Props = {
  value: string | Date | null | undefined;
  mode?: UserDateFormatMode | 'short' | 'date-short';
  className?: string;
  /** Shown until the client formats the value (avoids SSR/server timezone). */
  placeholder?: string;
};

function formatForMode(
  value: Date,
  mode: NonNullable<Props['mode']>,
): string {
  switch (mode) {
    case 'date':
      return formatUserDate(value);
    case 'date-short':
      return formatUserDateShort(value);
    case 'short':
      return formatUserDateTimeShort(value);
    case 'datetime':
    default:
      return formatUserDateTime(value);
  }
}

export default function UserDateTime({
  value,
  mode = 'datetime',
  className,
  placeholder = '…',
}: Props) {
  const parsed = useMemo(() => parseUserDate(value), [value]);
  const dateTime = parsed?.toISOString();
  const [label, setLabel] = useState(placeholder);

  useEffect(() => {
    if (!parsed) {
      setLabel('');
      return;
    }
    setLabel(formatForMode(parsed, mode));
  }, [parsed, mode]);

  if (!parsed || !dateTime) return null;

  return (
    <time dateTime={dateTime} className={className}>
      {label}
    </time>
  );
}
