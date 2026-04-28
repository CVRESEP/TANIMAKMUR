import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to format currency
export const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Helper to parse currency string to number
export const parseCurrency = (value: string): number => {
    return Number(value.replace(/[^0-9,-]+/g, "").replace(",", "."));
};

// Helper to format date
export const formatDate = (dateString: string) => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return "";
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// Helper to format date for input type="date"
export const toInputDate = (dateString: string) => {
    if (!dateString) return "";
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Check if it's in DD/MM/YYYY format and convert
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ""; // Return empty if format is unknown
};

// Helper to convert string to Title Case
export const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

    
