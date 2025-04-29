// Tell TypeScript that these modules exist
declare module '@/components/ui/form' {
  import React from 'react';
  import { ControllerProps, FieldPath, FieldValues } from 'react-hook-form';

  export const Form: React.FC<React.PropsWithChildren<any>>;
  export const FormItem: React.FC<React.PropsWithChildren<any>>;
  export const FormLabel: React.FC<React.PropsWithChildren<any>>;
  export const FormControl: React.FC<React.PropsWithChildren<any>>;
  export const FormDescription: React.FC<React.PropsWithChildren<any>>;
  export const FormMessage: React.FC<React.PropsWithChildren<any>>;
  export const FormField: <
    TFieldValues extends FieldValues = FieldValues,
    TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
  >(
    props: ControllerProps<TFieldValues, TName>
  ) => React.ReactElement;
}

declare module '@/components/ui/textarea' {
  import React from 'react';

  export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

  export const Textarea: React.ForwardRefExoticComponent<
    TextareaProps & React.RefAttributes<HTMLTextAreaElement>
  >;
}

declare module '@/components/ui/select' {
  import React from 'react';

  export const Select: React.FC<React.PropsWithChildren<any>>;
  export const SelectGroup: React.FC<React.PropsWithChildren<any>>;
  export const SelectValue: React.FC<React.PropsWithChildren<any>>;
  export const SelectTrigger: React.FC<React.PropsWithChildren<any>>;
  export const SelectContent: React.FC<React.PropsWithChildren<any>>;
  export const SelectLabel: React.FC<React.PropsWithChildren<any>>;
  export const SelectItem: React.FC<React.PropsWithChildren<any>>;
  export const SelectSeparator: React.FC<any>;
  export const SelectScrollUpButton: React.FC<React.PropsWithChildren<any>>;
  export const SelectScrollDownButton: React.FC<React.PropsWithChildren<any>>;
} 