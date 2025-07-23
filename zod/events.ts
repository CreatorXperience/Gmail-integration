import { z } from "zod";

const calendarEventSchema = z.object({
    summary: z.string({ message: "property summary is required" }).min(1, "Event summary is required"),
    messageId: z.string({ message: "property messageId is required" }),
    message: z.object({
        channelId: z.string({ message: "property channelId is required" }),
        projectId: z.string({ message: "property projectId is required" }),
        threadId: z.string({ message: "property threadId is required" }),
        user: z.string({ message: "property user is required" }),
        userId: z.string({ message: "property userId is required" }),
    }).optional(),
    taskId: z.string({ message: "property taskId is required" }),
    integrationId: z.string({ message: "property integrationId is required" }),
    workspaceId: z.string({ message: "property string is required" }),
    start: z.object({
        dateTime: z.string().min(1, "Start dateTime is required"),
        timeZone: z.string().min(1, "Start timeZone is required"),
    }),

    end: z.object({
        dateTime: z.string().min(1, "End dateTime is required"),
        timeZone: z.string().min(1, "End timeZone is required"),
    }),

    // Optional fields
    location: z.string(),
    description: z.string().optional(),

    recurrence: z.array(z.string()).optional(),

    attendees: z
        .array(
            z.object({
                email: z.string().email(),
            })
        )
        .optional(),
});


type TEvent = Required<z.infer<typeof calendarEventSchema>>


const validateEventPayload = (payload: TEvent) => {
    return calendarEventSchema.required().partial({ description: true, recurrence: true, message: true, attendees: true }).safeParse(payload)
}

export default validateEventPayload