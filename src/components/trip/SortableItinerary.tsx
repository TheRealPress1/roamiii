import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical, MapPin, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItineraryItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  location?: string;
  cost?: number;
  type: "activity" | "transport" | "accommodation" | "food" | "other";
  imageUrl?: string;
}

interface SortableItemProps {
  item: ItineraryItem;
  isOverlay?: boolean;
}

function SortableItem({ item, isOverlay }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeColors: Record<string, string> = {
    activity: "bg-green-100 text-green-700",
    transport: "bg-blue-100 text-blue-700",
    accommodation: "bg-amber-100 text-amber-700",
    food: "bg-red-100 text-red-700",
    other: "bg-gray-100 text-gray-700",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "shadow-2xl rotate-2"
      )}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex items-center px-3 bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Content */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                        typeColors[item.type]
                      )}
                    >
                      {item.type}
                    </span>
                  </div>
                  <h4 className="font-medium truncate">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {item.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {item.time}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.location}
                      </span>
                    )}
                    {item.cost !== undefined && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {item.cost}
                      </span>
                    )}
                  </div>
                </div>

                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SortableItineraryProps {
  items: ItineraryItem[];
  onReorder: (items: ItineraryItem[]) => void;
  className?: string;
}

export function SortableItinerary({
  items,
  onReorder,
  className,
}: SortableItineraryProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }

    setActiveId(null);
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-3", className)}>
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? <SortableItem item={activeItem} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

// Hook for managing itinerary state
export function useItinerary(initialItems: ItineraryItem[] = []) {
  const [items, setItems] = useState<ItineraryItem[]>(initialItems);

  const reorder = (newItems: ItineraryItem[]) => {
    setItems(newItems);
  };

  const addItem = (item: ItineraryItem) => {
    setItems((prev) => [...prev, item]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, updates: Partial<ItineraryItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  return {
    items,
    reorder,
    addItem,
    removeItem,
    updateItem,
    setItems,
  };
}
