import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ _id: false })
export class Lesson {
  @Prop({ required: true }) youtubeId: string;
  @Prop() title?: string;
  @Prop() durationText?: string;
  @Prop({ required: true }) order: number;
  @Prop({ default: false }) completed: boolean;
}
const LessonSchema = SchemaFactory.createForClass(Lesson);

/** A course = an ordered set of lessons built from a YouTube playlist (Pro). */
@Schema({ timestamps: true })
export class Course {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop()
  playlistId: string;

  @Prop()
  title: string;

  @Prop({ type: [LessonSchema], default: [] })
  lessons: Lesson[];
}

export const CourseSchema = SchemaFactory.createForClass(Course);
