export type QuestionType = "singleChoice" | "multiChoice" | "text" | "number";

export interface Question {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  options?: string[];
}
