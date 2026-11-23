import type * as React from 'react';

export interface ThemedButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Renders an <a> when set, else a <button>. */
  href?: string;
  /** Button type when no href. Default "button". */
  type?: 'button' | 'submit' | 'reset';
  /** Trailing arrow with the hero CTA's spacing. */
  arrow?: boolean;
  className?: string;
  children?: React.ReactNode;
}
export declare function ThemedButton(props: ThemedButtonProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  id: string;
  label?: string;
  /** Render a textarea. */
  multiline?: boolean;
  /** Textarea rows. Default 5. */
  rows?: number;
  /** Fixed leading segment, e.g. "+506". */
  prefix?: string;
}
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface Genre { id: string; name: string }
export interface GenreTabsProps {
  genres: Genre[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  'aria-label'?: string;
  className?: string;
}
export declare function GenreTabs(props: GenreTabsProps): React.ReactElement;

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardHeader: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardTitle: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardDescription: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardContent: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardFooter: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;

export interface EventCardProps {
  /** "YYYY-MM-DD" */
  date: string;
  name: string;
  location: { name: string };
  time?: { start: string };
  ticket?: {
    presale?: { price: string };
    regular: { price: string };
    type?: 'Entrada Libre' | 'Preventa' | 'Taquilla';
  };
  type?: 'Publico' | 'Privado';
  /** Override the date-before-today check. */
  passed?: boolean;
  className?: string;
}
export declare function EventCard(props: EventCardProps): React.ReactElement;

export interface BandMemberCardProps {
  image: string;
  name: string;
  instrument: string;
  className?: string;
}
export declare function BandMemberCard(props: BandMemberCardProps): React.ReactElement;

export interface SectionTitleProps { className?: string; children?: React.ReactNode }
export declare function SectionTitle(props: SectionTitleProps): React.ReactElement;

export interface TextGradientProps { className?: string; children?: React.ReactNode }
export declare function TextGradient(props: TextGradientProps): React.ReactElement;

export interface MessageDialogProps {
  tone?: 'success' | 'error';
  title: string;
  children?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}
export declare function MessageDialog(props: MessageDialogProps): React.ReactElement | null;
