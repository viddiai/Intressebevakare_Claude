import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, CalendarCheck } from "lucide-react";

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  sourceFilter?: string;
  onSourceChange?: (value: string) => void;
  locationFilter?: string;
  onLocationChange?: (value: string) => void;
  sellerFilter?: string;
  onSellerChange?: (value: string) => void;
  sellers?: Array<{ id: string; firstName: string | null; lastName: string | null }>;
  showOnlyTasksToday?: boolean;
  onShowOnlyTasksTodayChange?: (value: boolean) => void;
}

export default function FilterBar({
  searchValue = "",
  onSearchChange,
  sourceFilter = "all",
  onSourceChange,
  locationFilter = "all",
  onLocationChange,
  sellerFilter = "all",
  onSellerChange,
  sellers = [],
  showOnlyTasksToday = false,
  onShowOnlyTasksTodayChange,
}: FilterBarProps) {
  const sortedSellers = [...sellers].sort((a, b) => {
    const nameA = a.firstName || "";
    const nameB = b.firstName || "";
    return nameA.localeCompare(nameB, 'sv');
  });

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Sök lead..."
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9"
          data-testid="input-search-leads"
        />
      </div>
      
      <Select value={sourceFilter} onValueChange={onSourceChange}>
        <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-source">
          <SelectValue placeholder="Källa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla källor</SelectItem>
          <SelectItem value="BYTBIL">Bytbil</SelectItem>
          <SelectItem value="BLOCKET">Blocket</SelectItem>
          <SelectItem value="HEMSIDA">Hemsidan</SelectItem>
          <SelectItem value="EGET">Eget lead</SelectItem>
        </SelectContent>
      </Select>

      <Select value={locationFilter} onValueChange={onLocationChange}>
        <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-location">
          <SelectValue placeholder="Anläggning" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla anläggningar</SelectItem>
          <SelectItem value="Falkenberg">Falkenberg</SelectItem>
          <SelectItem value="Göteborg">Göteborg</SelectItem>
          <SelectItem value="Trollhättan">Trollhättan</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sellerFilter} onValueChange={onSellerChange}>
        <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-seller">
          <SelectValue placeholder="Säljare" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alla säljare</SelectItem>
          <SelectItem value="unassigned">Ej tilldelade</SelectItem>
          {sortedSellers.map((seller) => (
            <SelectItem key={seller.id} value={seller.id}>
              {seller.firstName && seller.lastName ? `${seller.firstName} ${seller.lastName}` : seller.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button 
        variant={showOnlyTasksToday ? "default" : "outline"} 
        className="gap-2 whitespace-nowrap"
        onClick={() => onShowOnlyTasksTodayChange?.(!showOnlyTasksToday)}
        data-testid="button-filter-tasks-today"
      >
        <CalendarCheck className="w-4 h-4" />
        <span className="hidden sm:inline">Uppgifter idag</span>
      </Button>
    </div>
  );
}
