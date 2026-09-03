import type {SchemaTypeDefinition} from 'sanity'

import {portableText} from './blocks/portable-text'
import {category} from './documents/category'
import {course} from './documents/course'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {contentImage} from './objects/content-image'
import {learningOutcome} from './objects/learning-outcome'
import {courseModule} from './objects/module'
import {lessonResource} from './objects/resource'

export const schemaTypes: SchemaTypeDefinition[] = [
  course,
  lesson,
  instructor,
  category,
  courseModule,
  learningOutcome,
  lessonResource,
  contentImage,
  portableText,
]
