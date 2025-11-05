import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge, { type LeadStatus } from "./StatusBadge";
import { MapPin, Calendar, ExternalLink, User, Car, Clock, AlertCircle } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { isToday, isPast, differenceInDays } from "date-fns";

const SWEDISH_TZ = "Europe/Stockholm";

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
  nextTask?: {
    id: string;
    description: string;
    dueDate: Date;
  } | null;
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
  nextTask,
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

  const getTaskPriority = (dueDate: Date) => {
    const taskDate = new Date(dueDate);
    const now = new Date();
    
    if (isPast(taskDate) && !isToday(taskDate)) {
      return { type: "overdue", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertCircle };
    }
    if (isToday(taskDate)) {
      return { type: "today", color: "text-yellow-600 dark:text-yellow-500", bgColor: "bg-yellow-100 dark:bg-yellow-950", icon: Clock };
    }
    const daysUntil = differenceInDays(taskDate, now);
    if (daysUntil <= 2) {
      return { type: "soon", color: "text-orange-600 dark:text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-950", icon: Clock };
    }
    return { type: "future", color: "text-muted-foreground", bgColor: "bg-muted/50", icon: Clock };
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

        {nextTask ? (
          (() => {
            const priority = getTaskPriority(nextTask.dueDate);
            const TaskIcon = priority.icon;
            return (
              <div 
                className={`${priority.bgColor} p-3 rounded-md border border-border/50`}
                data-testid={`lead-next-task-${id}`}
              >
                <div className="flex items-start gap-2">
                  <TaskIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${priority.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className={`font-medium ${priority.color}`}>Nästa: </span>
                      <span className="text-foreground">{nextTask.description}</span>
                    </p>
                    <p className={`text-xs mt-1 ${priority.color}`}>
                      {formatInTimeZone(new Date(nextTask.dueDate), SWEDISH_TZ, "yyyy-MM-dd HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="bg-muted/30 p-3 rounded-md border border-border/30">
            <p className="text-sm text-muted-foreground">
              Inga planerade uppgifter
            </p>
          </div>
        )}

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
