import { Home, LayoutDashboard, ListFilter, Settings, Car, LogOut, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Översikt",
    url: "/",
    icon: Home,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Mina Leads",
    url: "/leads",
    icon: ListFilter,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["MANAGER", "SALJARE"],
  },
  {
    title: "Säljarpool",
    url: "/seller-pools",
    icon: Users,
    roles: ["MANAGER"],
  },
  {
    title: "Inställningar",
    url: "/settings",
    icon: Settings,
    roles: ["MANAGER", "SALJARE"],
  },
];

export function AppSidebar() {
  const { user } = useAuth();

  const visibleMenuItems = menuItems.filter((item) => 
    item.roles.includes(user?.role || "SALJARE")
  );

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email || "Användare";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Car className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm text-sidebar-foreground">Lead-hantering</p>
            <p className="text-xs text-muted-foreground">Fritidsfordon</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{getUserDisplayName()}</p>
            <p className="text-xs text-muted-foreground">{user?.role || "SÄLJARE"}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          asChild
          data-testid="button-logout"
        >
          <a href="/api/logout">
            <LogOut className="h-4 w-4" />
            Logga ut
          </a>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
