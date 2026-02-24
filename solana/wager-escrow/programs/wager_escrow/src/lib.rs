use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("JCRT7U9RoxcQ7xt5PkZ3EsrPkDswGQRfcKkc2qB9cx4m");

#[program]
pub mod wager_escrow {
    use super::*;

    pub fn initialize_match(
        ctx: Context<InitializeMatch>,
        game_code: String,
        stake_lamports: u64,
        deadline_ts: i64,
        referee: Pubkey,
    ) -> Result<()> {
        require!(game_code.len() <= 16, WagerError::GameCodeTooLong);
        require!(stake_lamports > 0, WagerError::InvalidStake);

        let now = Clock::get()?.unix_timestamp;
        require!(deadline_ts > now, WagerError::InvalidDeadline);

        let m = &mut ctx.accounts.wager_match;
        m.bump = ctx.bumps.wager_match;
        m.game_code = game_code;
        m.host = ctx.accounts.host.key();
        m.guest = Pubkey::default();
        m.referee = referee;
        m.stake_lamports = stake_lamports;
        m.state = WagerState::Init;
        m.host_funded = false;
        m.guest_funded = false;
        m.deadline_ts = deadline_ts;
        m.created_at = now;
        Ok(())
    }

    pub fn fund_host(ctx: Context<FundHost>) -> Result<()> {
        let host_key = ctx.accounts.host.key();
        let stake_lamports = {
            let m = &ctx.accounts.wager_match;
            require!(m.state == WagerState::Init, WagerError::InvalidState);
            require!(!m.host_funded, WagerError::AlreadyFunded);
            require!(host_key == m.host, WagerError::Unauthorized);
            m.stake_lamports
        };

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.host.to_account_info(),
                    to: ctx.accounts.wager_match.to_account_info(),
                },
            ),
            stake_lamports,
        )?;

        let m = &mut ctx.accounts.wager_match;
        m.host_funded = true;
        m.state = WagerState::HostFunded;
        Ok(())
    }

    pub fn join_and_fund(ctx: Context<JoinAndFund>) -> Result<()> {
        let guest_key = ctx.accounts.guest.key();
        let stake_lamports = {
            let m = &ctx.accounts.wager_match;
            require!(m.state == WagerState::HostFunded, WagerError::InvalidState);
            require!(m.host_funded, WagerError::HostNotFunded);
            require!(!m.guest_funded, WagerError::AlreadyFunded);
            require!(guest_key != m.host, WagerError::InvalidGuest);
            m.stake_lamports
        };

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.guest.to_account_info(),
                    to: ctx.accounts.wager_match.to_account_info(),
                },
            ),
            stake_lamports,
        )?;

        let m = &mut ctx.accounts.wager_match;
        m.guest = guest_key;
        m.guest_funded = true;
        m.state = WagerState::BothFunded;
        Ok(())
    }

    pub fn settle_winner(ctx: Context<SettleWinner>, winner: Pubkey) -> Result<()> {
        let referee_key = ctx.accounts.referee.key();
        let winner_key = ctx.accounts.winner.key();
        let payout = {
            let m = &ctx.accounts.wager_match;
            require!(m.state == WagerState::BothFunded, WagerError::InvalidState);
            require!(referee_key == m.referee, WagerError::Unauthorized);
            require!(winner == m.host || winner == m.guest, WagerError::InvalidWinner);
            require!(winner_key == winner, WagerError::InvalidWinner);
            m.stake_lamports.checked_mul(2).ok_or(WagerError::MathOverflow)?
        };

        let wager_match_ai = ctx.accounts.wager_match.to_account_info();
        let winner_ai = ctx.accounts.winner.to_account_info();
        {
            let mut match_lamports = wager_match_ai.try_borrow_mut_lamports()?;
            **match_lamports -= payout;
        }
        {
            let mut winner_lamports = winner_ai.try_borrow_mut_lamports()?;
            **winner_lamports += payout;
        }

        let m = &mut ctx.accounts.wager_match;
        m.state = WagerState::Settled;
        Ok(())
    }

    pub fn refund_host_expired(ctx: Context<RefundHostExpired>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let host_key = ctx.accounts.host.key();
        let payout = {
            let m = &ctx.accounts.wager_match;
            require!(m.state == WagerState::HostFunded, WagerError::InvalidState);
            require!(host_key == m.host, WagerError::Unauthorized);
            require!(now >= m.deadline_ts, WagerError::DeadlineNotReached);
            m.stake_lamports
        };

        let wager_match_ai = ctx.accounts.wager_match.to_account_info();
        let host_ai = ctx.accounts.host.to_account_info();
        {
            let mut match_lamports = wager_match_ai.try_borrow_mut_lamports()?;
            **match_lamports -= payout;
        }
        {
            let mut host_lamports = host_ai.try_borrow_mut_lamports()?;
            **host_lamports += payout;
        }

        let m = &mut ctx.accounts.wager_match;
        m.state = WagerState::Refunded;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(game_code: String)]
pub struct InitializeMatch<'info> {
    #[account(
        init,
        payer = host,
        space = 8 + WagerMatch::INIT_SPACE,
        seeds = [b"wager_match", game_code.as_bytes()],
        bump
    )]
    pub wager_match: Account<'info, WagerMatch>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundHost<'info> {
    #[account(mut)]
    pub wager_match: Account<'info, WagerMatch>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinAndFund<'info> {
    #[account(mut)]
    pub wager_match: Account<'info, WagerMatch>,
    #[account(mut)]
    pub guest: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleWinner<'info> {
    #[account(mut)]
    pub wager_match: Account<'info, WagerMatch>,
    pub referee: Signer<'info>,
    #[account(mut)]
    /// CHECK: winner is validated against wager state
    pub winner: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RefundHostExpired<'info> {
    #[account(mut)]
    pub wager_match: Account<'info, WagerMatch>,
    #[account(mut)]
    pub host: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct WagerMatch {
    pub bump: u8,
    #[max_len(16)]
    pub game_code: String,
    pub host: Pubkey,
    pub guest: Pubkey,
    pub referee: Pubkey,
    pub stake_lamports: u64,
    pub state: WagerState,
    pub host_funded: bool,
    pub guest_funded: bool,
    pub deadline_ts: i64,
    pub created_at: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum WagerState {
    Init,
    HostFunded,
    BothFunded,
    Settled,
    Refunded,
}

#[error_code]
pub enum WagerError {
    #[msg("Game code is too long")]
    GameCodeTooLong,
    #[msg("Invalid stake")]
    InvalidStake,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Deadline not reached")]
    DeadlineNotReached,
    #[msg("Invalid state")]
    InvalidState,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Host has not funded yet")]
    HostNotFunded,
    #[msg("Account is already funded")]
    AlreadyFunded,
    #[msg("Invalid guest")]
    InvalidGuest,
    #[msg("Invalid winner")]
    InvalidWinner,
    #[msg("Math overflow")]
    MathOverflow,
}
