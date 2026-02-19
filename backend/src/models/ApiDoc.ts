import { Schema, model, Document } from "mongoose";

export interface IApiDoc extends Document {
    title: string;
    rawContent: string;
    language: "en" | "mixed";
    uploadedBy: number;
    createdAt: Date;
    updatedAt: Date;
}

const ApiDocSchema = new Schema<IApiDoc>(
    {
        title: { type: String, required: true },
        rawContent: { type: String, required: true },
        language: {
            type: String,
            enum: ["en", "mixed"],
            default: "en",
        },
        uploadedBy: { type: Number, required: true },
    },
    {
        timestamps: true,
        collection: "api_docs",
    }
);

ApiDocSchema.index({ language: 1 });
ApiDocSchema.index({ createdAt: -1 });

export const ApiDoc = model<IApiDoc>("ApiDoc", ApiDocSchema);
