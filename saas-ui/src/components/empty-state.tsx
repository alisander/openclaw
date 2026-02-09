import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  FileQuestion,
  Users,
  MessageSquare,
  Hash,
  Zap,
  Calendar,
  Plug,
  type LucideIcon,
} from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

export function EmptyChannels({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Hash}
      title="No channels configured"
      description="Set up channels to connect your AI assistant to messaging platforms."
      action={onCreate ? { label: "Add Channel", onClick: onCreate } : undefined}
    />
  );
}

export function EmptySkills() {
  return (
    <EmptyState
      icon={Zap}
      title="No skills available"
      description="Skills will appear here once they are configured for your account."
    />
  );
}

export function EmptyTasks({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No scheduled tasks"
      description="Create scheduled tasks to automate recurring actions."
      action={onCreate ? { label: "Create Task", onClick: onCreate } : undefined}
    />
  );
}

export function EmptyIntegrations() {
  return (
    <EmptyState
      icon={Plug}
      title="No integrations"
      description="Connect external services to extend your assistant's capabilities."
    />
  );
}

export function EmptyConversations({ onStart }: { onStart?: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No conversations yet"
      description="Start a chat with your AI assistant."
      action={onStart ? { label: "Start Chat", onClick: onStart } : undefined}
    />
  );
}

export function EmptyUsers() {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      description="Users will appear here once they sign up."
    />
  );
}

export function EmptySearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No results found"
      description={
        query
          ? `No results found for "${query}". Try a different search term.`
          : "No results match your search criteria."
      }
    />
  );
}
