
"use client";

import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Minus, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { id as idLocale } from 'date-fns/locale';
import { format, getMonth, getYear, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

interface DateFilterProps {
  data: any[];
  onFilterChange: (filteredData: any[]) => void;
  dateField?: string;
}

interface DateHierarchy {
  [year: string]: { [month: string]: boolean };
}

interface SelectionState {
  [year: string]: {
    checked: boolean | "indeterminate";
    months: { [month: string]: boolean };
  };
}

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(0, i), 'MMMM', { locale: idLocale }));

export const DateFilter: React.FC<DateFilterProps> = ({ data, onFilterChange, dateField = 'tanggal' }) => {
  const [isOpen, setIsOpen] = React.useState<{ [key: string]: boolean }>({});
  const [selection, setSelection] = React.useState<SelectionState>({});
  const [isInitialized, setIsInitialized] = React.useState(false);


  const dateHierarchy = React.useMemo(() => {
    const hierarchy: DateHierarchy = {};
    if (!data || data.length === 0) return hierarchy;

    data.forEach(item => {
      if (item[dateField]) {
        try {
          const date = parseISO(item[dateField]);
          const year = getYear(date).toString();
          const month = format(date, 'MMMM', { locale: idLocale });
          
          if (!hierarchy[year]) hierarchy[year] = {};
          hierarchy[year][month] = true;
        } catch (e) {
            // Ignore invalid dates
        }
      }
    });
    return hierarchy;
  }, [data, dateField]);

  React.useEffect(() => {
    const years = Object.keys(dateHierarchy).sort((a, b) => Number(b) - Number(a));
    if (years.length === 0 && data.length > 0) return;

    const newSelection: SelectionState = {};
    const now = new Date();
    
    const lastMonthDate = subMonths(now, 1);
    const currentMonth = format(now, 'MMMM', { locale: idLocale });
    const currentYear = getYear(now).toString();
    const lastMonth = format(lastMonthDate, 'MMMM', { locale: idLocale });
    const lastMonthYear = getYear(lastMonthDate).toString();

    let newIsOpenState: { [key: string]: boolean } = {};

    years.forEach(year => {
      const months = Object.keys(dateHierarchy[year]);
      newSelection[year] = { checked: false, months: {} };
      months.forEach(month => {
        const isSelected = (year === currentYear && month === currentMonth) || (year === lastMonthYear && month === lastMonth);
        newSelection[year].months[month] = isSelected;
        if (isSelected) {
            newIsOpenState[year] = true;
        }
      });
      
      const checkedMonthsCount = Object.values(newSelection[year].months).filter(Boolean).length;
      if (checkedMonthsCount === 0) {
        newSelection[year].checked = false;
      } else if (checkedMonthsCount === months.length) {
        newSelection[year].checked = true;
      } else {
        newSelection[year].checked = "indeterminate";
      }
    });
    setSelection(newSelection);
    setIsOpen(newIsOpenState);
    setIsInitialized(true);
  }, [dateHierarchy, data]);


  React.useEffect(() => {
    if (!isInitialized) return;
    
    const selectedMonths: { year: string; month: string }[] = [];
    Object.entries(selection).forEach(([year, yearData]) => {
      Object.entries(yearData.months).forEach(([month, isChecked]) => {
        if (isChecked) {
          selectedMonths.push({ year, month });
        }
      });
    });

    if (selectedMonths.length === 0 || !data) {
      onFilterChange(data || []);
      return;
    }

    const filtered = data.filter(item => {
      if (!item[dateField]) return false;
       try {
            const date = parseISO(item[dateField]);
            const itemYear = getYear(date).toString();
            const itemMonth = format(date, 'MMMM', { locale: idLocale });
            return selectedMonths.some(sm => sm.year === itemYear && sm.month === itemMonth);
        } catch (e) {
            return false;
        }
    });
    onFilterChange(filtered);
  }, [selection, data, onFilterChange, dateField, isInitialized]);


  const handleYearChange = (year: string, checked: boolean) => {
    setSelection(prev => {
      const newSelection = { ...prev };
      newSelection[year].checked = checked;
      Object.keys(newSelection[year].months).forEach(month => {
        newSelection[year].months[month] = checked;
      });
      return newSelection;
    });
  };

  const handleMonthChange = (year: string, month: string, checked: boolean) => {
    setSelection(prev => {
      const newSelection = { ...prev };
      newSelection[year].months[month] = checked;
      const totalMonths = Object.keys(newSelection[year].months).length;
      const checkedCount = Object.values(newSelection[year].months).filter(Boolean).length;

      if (checkedCount === 0) {
        newSelection[year].checked = false;
      } else if (checkedCount === totalMonths) {
        newSelection[year].checked = true;
      } else {
        newSelection[year].checked = 'indeterminate';
      }
      return newSelection;
    });
  };

  const handleSelectAll = (checked: boolean) => {
      setSelection(prev => {
          const newSelection = { ...prev };
          Object.keys(newSelection).forEach(year => {
              newSelection[year].checked = checked;
              Object.keys(newSelection[year].months).forEach(month => {
                  newSelection[year].months[month] = checked;
              });
          });
          return newSelection;
      });
  };
  
  const allYears = Object.keys(dateHierarchy).sort((a, b) => Number(b) - Number(a));

  const isAllSelected = React.useMemo(() => {
    if (Object.keys(selection).length === 0) return false;
    const allMonthsCount = allYears.reduce((acc, year) => acc + Object.keys(dateHierarchy[year]).length, 0);
    const selectedMonthsCount = Object.values(selection).reduce((acc, yearData) => acc + Object.values(yearData.months).filter(Boolean).length, 0);

    if (selectedMonthsCount === 0) return false;
    if (selectedMonthsCount === allMonthsCount) return true;
    return "indeterminate";
  }, [selection, allYears, dateHierarchy]);
  

  const popoverContent = (
      <div className="space-y-2 max-h-80 overflow-y-auto">
          <div className="flex items-center space-x-2 px-1">
              <Checkbox id="select-all" checked={isAllSelected} onCheckedChange={(checked) => handleSelectAll(Boolean(checked))} />
              <label htmlFor="select-all" className="font-medium">Pilih Semua</label>
          </div>
          {allYears.map(year => (
          <Collapsible key={year} open={isOpen[year]} onOpenChange={(open) => setIsOpen(prev => ({...prev, [year]: open}))}>
              <div className="flex items-center space-x-2">
              <CollapsibleTrigger asChild>
                   <Button variant="ghost" size="sm" className="p-1 h-auto">
                      {isOpen[year] ? <Minus className="h-4 w-4"/> : <Plus className="h-4 w-4"/>}
                      <span className="sr-only">Toggle</span>
                  </Button>
              </CollapsibleTrigger>
              <Checkbox id={`year-${year}`} checked={selection[year]?.checked} onCheckedChange={(checked) => handleYearChange(year, Boolean(checked))} />
              <label htmlFor={`year-${year}`} className="font-medium">{year}</label>
              </div>
              <CollapsibleContent className="pl-8 space-y-2 mt-1">
              {ALL_MONTHS.filter(month => dateHierarchy[year][month]).map(month => (
                  <div key={month} className="flex items-center space-x-2">
                  <Checkbox id={`month-${year}-${month}`} checked={selection[year]?.months[month]} onCheckedChange={(checked) => handleMonthChange(year, month, Boolean(checked))} />
                  <label htmlFor={`month-${year}-${month}`}>{month}</label>
                  </div>
              ))}
              </CollapsibleContent>
          </Collapsible>
          ))}
      </div>
  );

  return (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                Filter Tanggal
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
            {allYears.length > 0 ? popoverContent : <div className="p-2 text-sm text-center text-muted-foreground">Tidak ada data tanggal.</div>}
        </PopoverContent>
    </Popover>
  );
};
