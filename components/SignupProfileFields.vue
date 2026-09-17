<script setup lang="ts">
import type { useSignupForm } from '~/composables/useSignupForm'

// 会員登録フォームの基本項目。pages/signup/index.vue と pages/signup/referral.vue で共用する。
// 状態は呼び出し側の useSignupForm() が持ち、ここは入力欄を並べるだけ。
// .formgrid は PC 幅(768px以上)で2列になる — フォームを1画面に収めてスクロールを無くすため
// (assets/css/paper-theme.css)。メールアドレスだけは2列ぶん使う。
defineProps<{ form: ReturnType<typeof useSignupForm> }>()
</script>

<template>
  <div class="formgrid">
    <div>
      <label class="formlabel">お名前</label>
      <input v-model="form.name.value" type="text" required autocomplete="name" class="formfield" />
    </div>
    <div>
      <label class="formlabel">生年月日</label>
      <BirthdateSelect v-model="form.birthdate.value" theme="paper" />
    </div>
    <div>
      <label class="formlabel">性別</label>
      <GenderRadio v-model="form.gender.value" />
    </div>
    <div>
      <label class="formlabel">電話番号</label>
      <input v-model="form.phone.value" type="tel" required autocomplete="tel" class="formfield" />
    </div>
    <div class="formgrid__wide">
      <label class="formlabel">メールアドレス</label>
      <input v-model="form.email.value" type="email" required autocomplete="email" class="formfield" />
    </div>
    <div>
      <label class="formlabel">パスワード</label>
      <input v-model="form.password.value" type="password" required minlength="6" autocomplete="new-password" class="formfield" />
    </div>
    <div>
      <label class="formlabel">パスワード（確認）</label>
      <input v-model="form.passwordConfirm.value" type="password" required minlength="6" autocomplete="new-password" class="formfield" />
    </div>
  </div>
</template>
