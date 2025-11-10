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
  showOnlyWithNextTask?: boolean;
  onShowOnlyWithNextTaskChange?: (value: boolean) => void;
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
  showOnlyWithNextTask = false,
  onShowOnlyWithNextTaskChange,
}: FilterBarProps) {
  const sortedSellers = [...sellers].sort((a, b) => {
    const nameA = a.firstName || "";
    const nameB = b.firstName || "";
    return nameA.localeCompare(nameB, 'sv');
  });

  return (
    <div className="space-y-4">
      <div className="relative w-full">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Select value={sourceFilter} onValueChange={onSourceChange}>
          <SelectTrigger data-testid="select-source">
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
          <SelectTrigger data-testid="select-location">
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
          <SelectTrigger data-testid="select-seller">
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
          variant={showOnlyWithNextTask ? "default" : "outline"} 
          className="gap-2 w-full"
          onClick={() => onShowOnlyWithNextTaskChange?.(!showOnlyWithNextTask)}
          data-testid="button-filter-next-task"
        >
          <CalendarCheck className="w-4 h-4" />
          <span className="hidden sm:inline">Nästa uppgift</span>
          <span className="sm:hidden">Nästa</span>
        </Button>
      </div>
    </div>
  );
}
