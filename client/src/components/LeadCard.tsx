import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge, { type LeadStatus } from "./StatusBadge";
import { MapPin, Calendar, ExternalLink, User, Car } from "lucide-react";

interface LeadCardProps {
  id: string;
  vehicleTitle: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  source: "BYTBIL" | "BLOCKET" | "HEMSIDA" | "EGET";
  location: string;
  status: LeadStatus;
  createdAt: string;
  assignedTo?: string;
  vehicleLink?: string;
  nextStep?: string;
  onViewDetails?: () => void;
  onAssign?: () => void;
}

export default function LeadCard({
  id,
  vehicleTitle,
  contactName,
  contactEmail,
  contactPhone,
  source,
  location,
  status,
  createdAt,
  assignedTo,
  vehicleLink,
  nextStep,
  onViewDetails,
  onAssign
}: LeadCardProps) {
  const getSourceIcon = () => {
    if (source === "BYTBIL") return <Car className="w-4 h-4" />;
    if (source === "BLOCKET") return <Car className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getSourceLabel = () => {
    if (source === "BYTBIL") return "Bytbil";
    if (source === "BLOCKET") return "Blocket";
    if (source === "EGET") return "Eget lead";
    return "Hemsidan";
  };

  return (
    <Card className="p-6 hover-elevate" data-testid={`lead-card-${id}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-start gap-2 mb-2">
          <StatusBadge status={status} />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate" data-testid={`lead-title-${id}`}>
              {vehicleTitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1" data-testid={`lead-contact-${id}`}>
              {contactName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {getSourceIcon()}
            <span>{getSourceLabel()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{createdAt}</span>
          </div>
        </div>

        {contactEmail && (
          <div className="text-sm">
            <span className="text-muted-foreground">E-post: </span>
            <span className="text-foreground">{contactEmail}</span>
          </div>
        )}

        {contactPhone && (
          <div className="text-sm">
            <span className="text-muted-foreground">Telefon: </span>
            <span className="text-foreground">{contactPhone}</span>
          </div>
        )}

        <div className="text-sm">
          <span className="text-muted-foreground">Tilldelad: </span>
          <span className="text-foreground font-medium" data-testid={`lead-assigned-${id}`}>
            {assignedTo || "Ej tilldelad"}
          </span>
        </div>

        {nextStep && (
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-sm">
              <span className="font-medium text-foreground">Nästa steg: </span>
              <span className="text-muted-foreground">{nextStep}</span>
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={onViewDetails}
            data-testid={`button-view-lead-${id}`}
          >
            Visa detaljer
          </Button>
          {!assignedTo && onAssign && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAssign}
              data-testid={`button-assign-lead-${id}`}
            >
              Tilldela
            </Button>
          )}
          {vehicleLink && (
            <Button 
              variant="ghost" 
              size="sm"
              asChild
            >
              <a href={vehicleLink} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                <ExternalLink className="w-4 h-4" />
                Visa annons
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
