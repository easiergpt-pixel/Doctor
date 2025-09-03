import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  slotDuration: number;
  maxBookingsPerSlot: number;
  notes?: string;
}

interface SpecialAvailability {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  reason?: string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleSettings() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [editingSlot, setEditingSlot] = useState<Partial<ScheduleSlot> | null>(null);
  const [editingSpecial, setEditingSpecial] = useState<Partial<SpecialAvailability> | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: scheduleSlots } = useQuery<ScheduleSlot[]>({
    queryKey: ["/api/schedule-slots"],
    enabled: isAuthenticated,
  });

  const { data: specialAvailability } = useQuery<SpecialAvailability[]>({
    queryKey: ["/api/special-availability"],
    enabled: isAuthenticated,
  });

  const createSlotMutation = useMutation({
    mutationFn: async (slotData: Partial<ScheduleSlot>) => {
      return await apiRequest("POST", "/api/schedule-slots", slotData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-slots"] });
      setEditingSlot(null);
      toast({
        title: "Schedule Updated",
        description: "Your availability has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, ...slotData }: Partial<ScheduleSlot>) => {
      return await apiRequest("PATCH", `/api/schedule-slots/${id}`, slotData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-slots"] });
      setEditingSlot(null);
      toast({
        title: "Schedule Updated",
        description: "Your availability has been updated successfully.",
      });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/schedule-slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-slots"] });
      toast({
        title: "Schedule Updated",
        description: "Time slot has been removed.",
      });
    },
  });

  const createSpecialMutation = useMutation({
    mutationFn: async (specialData: Partial<SpecialAvailability>) => {
      return await apiRequest("POST", "/api/special-availability", specialData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-availability"] });
      setEditingSpecial(null);
      toast({
        title: "Special Availability Added",
        description: "Your special hours have been saved.",
      });
    },
  });

  const deleteSpecialMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/special-availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/special-availability"] });
      toast({
        title: "Removed",
        description: "Special availability has been removed.",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSaveSlot = () => {
    if (!editingSlot) return;

    if (editingSlot.id) {
      updateSlotMutation.mutate(editingSlot as ScheduleSlot);
    } else {
      createSlotMutation.mutate(editingSlot);
    }
  };

  const handleSaveSpecial = () => {
    if (!editingSpecial) return;
    createSpecialMutation.mutate(editingSpecial);
  };

  const groupedSlots = Array.isArray(scheduleSlots) 
    ? scheduleSlots.reduce((groups, slot) => {
        if (!groups[slot.dayOfWeek]) {
          groups[slot.dayOfWeek] = [];
        }
        groups[slot.dayOfWeek].push(slot);
        return groups;
      }, {} as Record<number, ScheduleSlot[]>)
    : {};

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={false} onToggle={() => {}} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Schedule Settings" 
          subtitle="Manage your availability and working hours"
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Schedule Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Array.isArray(scheduleSlots) ? scheduleSlots.filter(s => s.isAvailable).length : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Time Slots</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Array.isArray(specialAvailability) ? specialAvailability.length : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Special Dates</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Array.isArray(scheduleSlots) 
                        ? Math.round(scheduleSlots.reduce((sum, slot) => sum + slot.slotDuration, 0) / 60)
                        : 0}h
                    </div>
                    <div className="text-sm text-muted-foreground">Weekly Hours</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Schedule */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-green-600" />
                  Weekly Schedule
                </CardTitle>
                <Button
                  onClick={() => setEditingSlot({ 
                    dayOfWeek: 1, 
                    startTime: "09:00", 
                    endTime: "17:00", 
                    isAvailable: true,
                    slotDuration: 30,
                    maxBookingsPerSlot: 1
                  })}
                  size="sm"
                  data-testid="button-add-time-slot"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayNames.map((dayName, dayIndex) => (
                    <div key={dayIndex} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-lg">{dayName}</h3>
                        <Badge variant={groupedSlots[dayIndex]?.length > 0 ? "default" : "secondary"}>
                          {groupedSlots[dayIndex]?.length || 0} slots
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupedSlots[dayIndex]?.map((slot) => (
                          <div 
                            key={slot.id} 
                            className={`p-3 border rounded-lg ${slot.isAvailable 
                              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                              : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">
                                {slot.startTime} - {slot.endTime}
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSlot(slot)}
                                  data-testid={`button-edit-slot-${slot.id}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSlotMutation.mutate(slot.id)}
                                  data-testid={`button-delete-slot-${slot.id}`}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {slot.slotDuration}min slots • Max {slot.maxBookingsPerSlot} bookings
                            </div>
                            {slot.notes && (
                              <div className="text-xs text-muted-foreground mt-1 italic">
                                {slot.notes}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {(!groupedSlots[dayIndex] || groupedSlots[dayIndex].length === 0) && (
                          <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-muted-foreground">
                            <Clock className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                            <div className="text-sm">No time slots set</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingSlot({ 
                                dayOfWeek: dayIndex, 
                                startTime: "09:00", 
                                endTime: "17:00", 
                                isAvailable: true,
                                slotDuration: 30,
                                maxBookingsPerSlot: 1
                              })}
                              className="mt-2"
                            >
                              Add Slot
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Special Availability */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                  Special Availability & Blackout Dates
                </CardTitle>
                <Button
                  onClick={() => setEditingSpecial({ 
                    date: format(new Date(), "yyyy-MM-dd"),
                    isAvailable: false
                  })}
                  size="sm"
                  variant="outline"
                  data-testid="button-add-special-date"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Special Date
                </Button>
              </CardHeader>
              <CardContent>
                {Array.isArray(specialAvailability) && specialAvailability.length > 0 ? (
                  <div className="space-y-3">
                    {specialAvailability.map((special) => (
                      <div 
                        key={special.id} 
                        className={`p-4 border rounded-lg ${special.isAvailable 
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800' 
                          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium flex items-center">
                              {special.isAvailable ? (
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 mr-2 text-red-600" />
                              )}
                              {format(new Date(special.date), "EEEE, MMMM d, yyyy")}
                              {special.startTime && special.endTime && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  {special.startTime} - {special.endTime}
                                </span>
                              )}
                            </div>
                            {special.reason && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {special.reason}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSpecialMutation.mutate(special.id)}
                            data-testid={`button-delete-special-${special.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <div className="text-lg font-medium mb-2">No special dates set</div>
                    <div className="text-sm">Add holidays, vacation days, or special working hours</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Time Slot Modal */}
            {editingSlot && (
              <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-background border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-lg font-semibold mb-4">
                    {editingSlot.id ? 'Edit Time Slot' : 'Add Time Slot'}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dayOfWeek">Day of Week</Label>
                      <Select 
                        value={editingSlot.dayOfWeek?.toString()} 
                        onValueChange={(value) => setEditingSlot({...editingSlot, dayOfWeek: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={editingSlot.startTime || ""}
                          onChange={(e) => setEditingSlot({...editingSlot, startTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={editingSlot.endTime || ""}
                          onChange={(e) => setEditingSlot({...editingSlot, endTime: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                        <Input
                          id="slotDuration"
                          type="number"
                          min="15"
                          max="180"
                          step="15"
                          value={editingSlot.slotDuration || 30}
                          onChange={(e) => setEditingSlot({...editingSlot, slotDuration: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxBookings">Max Bookings</Label>
                        <Input
                          id="maxBookings"
                          type="number"
                          min="1"
                          max="10"
                          value={editingSlot.maxBookingsPerSlot || 1}
                          onChange={(e) => setEditingSlot({...editingSlot, maxBookingsPerSlot: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isAvailable"
                        checked={editingSlot.isAvailable || false}
                        onCheckedChange={(checked) => setEditingSlot({...editingSlot, isAvailable: checked})}
                      />
                      <Label htmlFor="isAvailable">Available for bookings</Label>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Special instructions or notes..."
                        value={editingSlot.notes || ""}
                        onChange={(e) => setEditingSlot({...editingSlot, notes: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setEditingSlot(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSlot} data-testid="button-save-slot">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Edit Special Availability Modal */}
            {editingSpecial && (
              <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-background border rounded-lg p-6 max-w-md w-full">
                  <h2 className="text-lg font-semibold mb-4">Add Special Date</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="specialDate">Date</Label>
                      <Input
                        id="specialDate"
                        type="date"
                        value={editingSpecial.date || ""}
                        onChange={(e) => setEditingSpecial({...editingSpecial, date: e.target.value})}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isSpecialAvailable"
                        checked={editingSpecial.isAvailable || false}
                        onCheckedChange={(checked) => setEditingSpecial({...editingSpecial, isAvailable: checked})}
                      />
                      <Label htmlFor="isSpecialAvailable">
                        {editingSpecial.isAvailable ? 'Special availability' : 'Blackout date (unavailable)'}
                      </Label>
                    </div>

                    {editingSpecial.isAvailable && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="specialStartTime">Start Time (optional)</Label>
                          <Input
                            id="specialStartTime"
                            type="time"
                            value={editingSpecial.startTime || ""}
                            onChange={(e) => setEditingSpecial({...editingSpecial, startTime: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="specialEndTime">End Time (optional)</Label>
                          <Input
                            id="specialEndTime"
                            type="time"
                            value={editingSpecial.endTime || ""}
                            onChange={(e) => setEditingSpecial({...editingSpecial, endTime: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="specialReason">Reason</Label>
                      <Input
                        id="specialReason"
                        placeholder="Holiday, vacation, special hours..."
                        value={editingSpecial.reason || ""}
                        onChange={(e) => setEditingSpecial({...editingSpecial, reason: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline" onClick={() => setEditingSpecial(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSpecial} data-testid="button-save-special">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}