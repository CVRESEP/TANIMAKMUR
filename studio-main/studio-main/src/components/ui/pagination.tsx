
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getPaginationGroup = () => {
    const start = Math.floor((currentPage - 1) / 5) * 5;
    const end = Math.min(start + 5, totalPages);
    return new Array(end - start).fill(0).map((_, idx) => start + 1 + idx);
  };

  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <span className="text-sm text-muted-foreground">
        Halaman {currentPage} dari {totalPages}
      </span>
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPaginationGroup().map(item => (
          <Button
            key={item}
            variant={currentPage === item ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
         <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
