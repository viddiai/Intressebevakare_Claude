import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  sourceFilter?: string;
  onSourceChange?: (value: string) => void;
  locationFilter?: string;
  onLocationChange?: (value: string) => void;
}

export default function FilterBar({
  searchValue = "",
  onSearchChange,
  sourceFilter = "all",
  onSourceChange,
  locationFilter = "all",
  onLocationChange,
}: FilterBarProps) {
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
          <SelectItem value="MANUELL">Hemsidan</SelectItem>
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

      <Button variant="outline" size="icon" data-testid="button-filter">
        <Filter className="w-4 h-4" />
      </Button>
    </div>
  );
}
