export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeUsername(username: string) {
  return username
    // Put all characters to lower case
    .toLowerCase()
    // Replaces all grammatical accents for non accents characters
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Replace ' ' and '-' to '_'
    .replace(/[ -]/g, '_')
    // Remove all not allowed characters
    .replace(/[^.0-9_a-zA-Z]/g, '')
    // Avoid multiple dots character
    .replace(/[.]{2,}/g, '.')
    // Remove all not alphanumeric characters on start
    .replace(/^[^0-9a-z]/g, '')
   
}

// String utilities
export function capitalize(str: string, lower = true): string {
  return (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
}

export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.toLowerCase().slice(1);
}

export function nameInitials(name: string, count: number | 'first_last' = 2): string {
  const initials = name.trim().split(' ').map((n) => n[0].toLocaleUpperCase());

  if(count === 'first_last'){
    return initials[0] + (initials.length > 1 ? initials[initials.length - 1] : '');
  }

  return initials.join('').substring(0, count);
}

// Date utilities
export function dateAddSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

export function dateDiffInSeconds(date1: Date, date2: Date): number {
  return Math.floor((date2.getTime() - date1.getTime()) / 1000);
}

export function dateDiffInMinutes(date1: Date, date2: Date): number {
  return Math.floor(dateDiffInSeconds(date1, date2) / 60);
}

export function dateDiffInHours(date1: Date, date2: Date): number {
  return Math.floor(dateDiffInMinutes(date1, date2) / 60);
}

export type DateFormatVariant = 'short' | 'long';

export function formatDateTime(date: Date, locale = 'pt-BR', variant: DateFormatVariant = 'short') {
  return {
    short: formatDate(date, locale, variant) + ' ' + formatTime(date, locale, variant),
    long: date.toLocaleDateString(locale, {
      year: "numeric", month: "long", day: "numeric",
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
  }[variant];
}

export function formatDate(date: Date, locale = 'pt-BR', variant: DateFormatVariant = 'short') {
  return {
    short: date.toLocaleDateString(locale),
    long: date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric", month: "long", day: "numeric" 
    }),
  }[variant];
}

export function formatTime(date: Date, locale = 'pt-BR', variant: DateFormatVariant = 'short') {
  return {
    short: date.toLocaleTimeString(locale),
    long: date.toLocaleTimeString(locale, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
  }[variant];
}

// Object utilities
export function getNestedObjectValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function exclude<O extends object, KA extends Array<keyof O>>(obJ?: O, ...attributes: KA){
  if(!obJ) return undefined as unknown as O;
  const newObj = { ...obJ };
  attributes.forEach(attr => {
    delete newObj[attr]
  });
  // Return the new object without the excluded attributes
  return newObj as Omit<O, KA[number]>;
}

// Array utilities
export const distinct = (<A extends Array<O>, O>(...keys: Array<keyof O>) =>
  (it: O, i: keyof A, a: A) => (a.findIndex(ait =>
    typeof it === 'object' && typeof it === 'object' && it && keys.length > 0 ?
      keys.every(key => ait[key] === it[key]) : ait === it
    ) === i
  )
);

export const checkIsCuid = (str: string) => /^[a-z0-9]{25}$/.test(str);

export function generate_uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function dataURLtoFile(dataUrl: string, filename: string) {
  const arr = dataUrl.split(',');
  if(!arr[0]) return;
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

export function bytesToString(bytes: number) {
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  if (bytes <= 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFilenameExtension(filename: string){
  return (filename.includes('.') && filename.split('.').slice(-1)[0]) || undefined;
}

export function replaceFilenameExtension(filename: string, newExtension: string){
  const filenameWithoutExtension = (filename.includes('.') && filename.split('.')
    .slice(0, -1).join('.')
  ) || filename;
  
  return `${filenameWithoutExtension}.${newExtension}`;
}
