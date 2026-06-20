import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppSettingDocument = HydratedDocument<AppSetting>;

/** Generic admin-editable key/value store (feature flags, banner text, etc.). */
@Schema({ timestamps: true })
export class AppSetting {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ type: Object })
  value: unknown;
}

export const AppSettingSchema = SchemaFactory.createForClass(AppSetting);
