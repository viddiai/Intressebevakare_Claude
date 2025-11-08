import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, Link } from "wouter";
import type { MessageWithUsers } from "@shared/schema";

type Conversation = {
  leadId: string;
  leadTitle: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  participants: Array<{
    userId: string;
    userName: string;
    userProfileImageUrl: string | null;
  }>;
};

export default function Messages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageContent, setMessageContent] = useState("");

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithUsers[]>({
    queryKey: [`/api/messages/lead/${selectedLeadId}`],
    enabled: !!selectedLeadId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: string; content: string; leadId: string }) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/lead/${selectedLeadId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setMessageContent("");
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedLeadId || !selectedRecipientId) return;

    sendMessageMutation.mutate({
      receiverId: selectedRecipientId,
      content: messageContent,
      leadId: selectedLeadId,
    });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.leadTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.userName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedConversation = conversations.find(
    (conv) => conv.leadId === selectedLeadId
  );

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatMessageTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: sv,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div
        className={`${
          selectedLeadId ? "hidden md:flex" : "flex"
        } w-full md:w-80 border-r flex-col`}
      >
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold mb-4" data-testid="text-messages-title">
            Meddelanden
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök konversationer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Laddar konversationer...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? "Inga konversationer hittades" : "Inga konversationer ännu"}
            </div>
          ) : (
            <div>
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.leadId}
                  onClick={() => {
                    setSelectedLeadId(conversation.leadId);
                    const otherParticipants = conversation.participants.filter(p => p.userId !== user?.id);
                    if (otherParticipants.length > 0) {
                      setSelectedRecipientId(otherParticipants[0].userId);
                    }
                  }}
                  className={`p-4 cursor-pointer hover-elevate active-elevate-2 border-b ${
                    selectedLeadId === conversation.leadId ? "bg-accent" : ""
                  }`}
                  data-testid={`conversation-${conversation.leadId}`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`font-medium truncate ${
                          conversation.unreadCount > 0 ? "font-bold" : ""
                        }`}
                        data-testid={`text-conversation-lead-${conversation.leadId}`}
                      >
                        {conversation.leadTitle}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span
                          className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-5 text-center"
                          data-testid={`badge-unread-${conversation.leadId}`}
                        >
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {conversation.participants.map((participant, index) => (
                        <Badge 
                          key={participant.userId} 
                          variant="secondary" 
                          className="text-xs"
                          data-testid={`badge-participant-${participant.userId}`}
                        >
                          {participant.userName}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMessageTime(conversation.lastMessageTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className={`${selectedLeadId ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        {selectedLeadId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-3 sm:p-4 border-b">
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0"
                  onClick={() => {
                    setSelectedLeadId(null);
                    setSelectedRecipientId(null);
                  }}
                  data-testid="button-back-to-conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold truncate" data-testid="text-chat-lead-title">
                    {selectedConversation.leadTitle}
                  </h2>
                  <Link 
                    href={`/leads/${selectedConversation.leadId}`}
                    className="text-xs text-primary hover:underline"
                    data-testid="link-view-lead"
                  >
                    Visa lead
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Deltagare:</span>
                {selectedConversation.participants.map((participant) => (
                  <Badge 
                    key={participant.userId} 
                    variant="secondary"
                    data-testid={`badge-chat-participant-${participant.userId}`}
                  >
                    {participant.userName}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3 sm:p-4">
              {messagesLoading ? (
                <div className="text-center text-muted-foreground">
                  Laddar meddelanden...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground px-4">
                  Inga meddelanden ännu. Skicka ett meddelande för att starta konversationen!
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.senderId === user.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                        data-testid={`message-${message.id}`}
                      >
                        {/* Sender avatar */}
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.senderProfileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(message.senderName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Message content */}
                        <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                          {/* Sender name */}
                          <p className="text-xs text-muted-foreground mb-1 px-1">
                            {message.senderName}
                          </p>
                          
                          {/* Message bubble */}
                          <div
                            className={`max-w-[85%] sm:max-w-xs md:max-w-sm lg:max-w-md ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            } rounded-lg p-3`}
                          >
                            <p className="text-xs text-muted-foreground mb-2">
                              Till: {message.receiverName}
                            </p>
                            <p className="break-words whitespace-pre-wrap">
                              {message.content}
                            </p>
                            <p
                              className={`text-xs mt-2 ${
                                isOwnMessage
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 sm:p-4 border-t space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Till:</span>
                <Select 
                  value={selectedRecipientId || undefined} 
                  onValueChange={setSelectedRecipientId}
                >
                  <SelectTrigger className="w-[200px]" data-testid="select-recipient">
                    <SelectValue placeholder="Välj mottagare" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedConversation.participants
                      .filter(p => p.userId !== user?.id)
                      .map((participant) => (
                        <SelectItem 
                          key={participant.userId} 
                          value={participant.userId}
                          data-testid={`select-recipient-option-${participant.userId}`}
                        >
                          {participant.userName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Skriv ett meddelande..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessageMutation.isPending}
                  className="text-base"
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || !selectedRecipientId || sendMessageMutation.isPending}
                  size="icon"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">Välj en konversation för att börja chatta</p>
              <p className="text-sm mt-2">
                eller starta en ny konversation från en lead
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
