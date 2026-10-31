<script setup lang="ts">
const woerter = [
  {id:1, word: 'house',translation: 'Haus'},
  {id:2, word: 'cat', translation: 'Katze'},
  {id:3, word: 'dog', translation: 'Hund'}]
</script>

<template>
<p v-for="wort in woerter" :key="wort.id">
  {{ wort.word }}- {{ wort.translation }}
</p>
</template>

<style scoped>

</style>
